<template>
    <!-- <template v-if="oItem.type=='group'">
        <div class="form-group">
            <template v-for="(oGroupItem, sGroupName) in oItem.items" :key="oGroupItem">
                <form_component :item="oGroupItem" />
            </template>
        </div>
    </template> -->
    <template v-if="oItem.type=='text'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="text" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='textarea'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <textarea class="form-control" rows="10" :placeholder="oItem.placeholder" v-model="mValue"></textarea>
        </div>
    </template>
    <template v-if="oItem.type=='email'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="email" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='color'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="color" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='date'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="date" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='datetime-local'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="datetime-local" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='file'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="file" class="form-control">
        </div>
    </template>
    <template v-if="oItem.type=='month'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="month" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='number'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="number" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='password'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="password" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='range'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="range" class="form-control" :placeholder="oItem.placeholder" v-model="mValue" :min="oItem.min" :max="oItem.max">
        </div>
    </template>
    <template v-if="oItem.type=='search'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="search" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='tel'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="tel" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='time'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="time" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='url'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="url" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='week'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <input type="week" class="form-control" :placeholder="oItem.placeholder" v-model="mValue">
        </div>
    </template>
    <template v-if="oItem.type=='checkbox_list'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <template v-for="oCheckboxItem in oItem.items" :key="oCheckboxItem">
                <div><label><input type="checkbox" v-model="mValue" :value="oCheckboxItem.value">{{oCheckboxItem.label}}</label></div>
            </template>
        </div>
    </template>
    <template v-if="oItem.type=='radio_list'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <template v-for="oCheckboxItem in oItem.items" :key="oCheckboxItem">
                <div><label><input type="radio" v-model="mValue" :value="oCheckboxItem.value">{{oCheckboxItem.label}}</label></div>
            </template>
        </div>
    </template>
    <template v-if="oItem.type=='select'">
        <div class="mb-3">
            <label class="form-label">{{oItem.label}}</label>
            <select class="form-control" v-model="mValue">
            <template v-for="oCheckboxItem in oItem.items" :key="oCheckboxItem">
                <option :value="oCheckboxItem.value">{{oCheckboxItem.label}}</option>
            </template>
            </select>
        </div>
    </template>
</template>

<script>
export default {
    props: ['item', 'value'],
    emits: ['input'],

    computed: {
        oItem() {
            return this.item
        },
        mValue: {
            get() {
                return this.value
            },
            set(mV) {
                this.$emit('input', mV)
            }
        }
    }
}
</script>

<style>
.form-group {
    display: flex;
    gap: 5px;
}
</style>